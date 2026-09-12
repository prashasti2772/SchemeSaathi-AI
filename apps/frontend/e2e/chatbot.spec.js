import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
const artifacts = fileURLToPath(new URL("../../../artifacts/", import.meta.url));

async function ask(page, text) {
  const before = await page.getByTestId("assistant-message").count();
  await page.getByRole("textbox").fill(text);
  await page.getByRole("textbox").press("Enter");
  await expect(page.getByTestId("assistant-message")).toHaveCount(before + 1);
  return page.getByTestId("assistant-message").last();
}

test("the reported subsidy question gets an explanation and relevant follow-ups", async ({ page }) => {
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/ai-assistant");
  const answer = await ask(page, "tell me what is subsidy");
  await expect(answer).toContainText("financial support");
  await expect(answer).not.toContainText("top matching");
  await expect(page.locator("main details")).toHaveCount(0);
  await expect(await ask(page, "give me an example")).toContainText("only an example");
  await expect(await ask(page, "Do I have to pay it back?")).toContainText("linked loan still needs repayment");
  await expect(await ask(page, "What documents are needed for PMEGP?")).toContainText("Documents:");
  await expect(page.getByTestId("assistant-message").last()).not.toContainText("Benefits:");
  await expect(await ask(page, "What is interest?")).toContainText("cost of borrowing");
  await page.screenshot({ path: artifacts + "/chatbot-conversation-desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("language selector, suggestions and answers work in every website language", async ({ page }) => {
  await page.goto("/ai-assistant");
  const samples = [
    ["hi", "सब्सिडी क्या है?", "आर्थिक सहायता"],
    ["mr", "सब्सिडी म्हणजे काय?", "आर्थिक सहाय्य"],
    ["gu", "સબસિડી શું છે?", "આર્થિક મદદ"],
    ["ta", "மானியம் என்றால் என்ன?", "நிதி உதவி"],
    ["te", "సబ్సిడీ అంటే ఏమిటి?", "ఆర్థిక సహాయం"],
    ["bn", "ভর্তুকি কী?", "আর্থিক সহায়তা"],
    ["kn", "ಸಬ್ಸಿಡಿ ಎಂದರೇನು?", "ಹಣಕಾಸಿನ ನೆರವು"],
  ];
  for (const [code, question, phrase] of samples) {
    await page.locator("main select").selectOption(code);
    const answer = await ask(page, question);
    await expect(answer).toHaveAttribute("lang", code);
    await expect(answer).toContainText(phrase);
    await expect(answer).not.toContainText("Translation is unavailable");
  }
  await page.locator("main select").selectOption("hi");
  await page.reload();
  await expect(page.locator("main select")).toHaveValue("hi");
  await expect(await ask(page, "tell me what is subsidy")).toContainText("आर्थिक सहायता");
  await page.setViewportSize({width:390,height:844});
  await page.locator("main button").first().click();
  await ask(page, "tell me what is subsidy");
  await expect(page.getByRole("heading", {level:1})).toBeVisible();
  await page.getByRole("textbox").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({path:artifacts+"/chatbot-hindi-mobile.png",fullPage:true});
});

test("retry does not duplicate user text or send an error as conversation history", async ({ page }) => {
  let calls = 0;
  await page.route("**/public/self-service/assistant-chat", async route => {
    calls++;
    if (calls === 1) await route.fulfill({status:503,contentType:"application/json",body:'{"detail":"temporary outage"}'});
    else {
      const payload = route.request().postDataJSON();
      expect(payload.message).toBe("What is a subsidy?");
      expect(payload.history).toEqual([]);
      await route.fulfill({json:{reply:"Recovered reply",retrieved_schemes:[],language:"en"}});
    }
  });
  await page.goto("/ai-assistant");
  await page.getByRole("textbox").fill("What is a subsidy?");
  await page.getByRole("textbox").press("Enter");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", {name:"Retry",exact:true}).click();
  await expect(page.getByTestId("assistant-message")).toHaveText("Recovered reply");
  await expect(page.getByTestId("user-message")).toHaveCount(1);
});

test("new chat clears history and cancels an in-flight reply", async ({ page }) => {
  let release;
  const gate = new Promise(resolve => {release=resolve;});
  await page.route("**/public/self-service/assistant-chat", async route => {
    await gate;
    await route.fulfill({json:{reply:"Old reply",retrieved_schemes:[]}}).catch(() => {});
  });
  await page.goto("/ai-assistant");
  await page.getByRole("textbox").fill("Old question");
  await page.getByRole("textbox").press("Enter");
  await expect(page.getByTestId("user-message")).toBeVisible();
  await page.getByRole("button", {name:/New chat/}).filter({visible:true}).click();
  release();
  await expect(page.getByTestId("user-message")).toHaveCount(0);
  await expect(page.getByTestId("assistant-message")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("assistant-message")).toHaveCount(0);
});
