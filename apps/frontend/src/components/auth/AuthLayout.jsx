import { useLanguage } from "../../lib/i18n.jsx";
import logo from "../logo.jpg";

const copy = {
  register: { title: "Create your account", description: "Find the right support to start and grow your business." },
  signin: { title: "Welcome back", description: "Sign in to continue your journey with SchemeSaathi AI." },
  recovery: { title: "Recover your account", description: "Verify your email or mobile number and choose a new password to get back to your scheme matches." },
};

export default function AuthLayout({ children, mode = "register" }) {
  const { t } = useLanguage();
  const content = copy[mode] || copy.register;
  return <div className="min-h-screen bg-[#f5f6fa] lg:grid lg:grid-cols-[36%_64%]">
    <aside className="hidden min-h-screen bg-[#0d2b55] px-10 py-10 text-white lg:flex lg:flex-col xl:px-14">
      <a href="/" className="block w-fit rounded-lg bg-white p-3"><img src={logo} alt={t("SchemeSaathi AI home")} className="h-auto w-56 max-w-full object-contain" /></a>
      <div className="my-16 max-w-sm">
        <h1 className="text-4xl font-extrabold leading-tight">{content.title}</h1>
        <p className="mt-4 text-lg leading-7 text-slate-200">{content.description}</p>
        <div className="mt-10 space-y-6">
          <Feature text={t("Personalized scheme matches")} />
          <Feature text={t("AI-powered guidance")} />
          <Feature text={t("Your account, securely accessible")} />
          <Feature text={t("Free to use")} />
        </div>
      </div>
      <p className="mt-auto text-xs font-medium text-[#f4c63d]">{t("SchemeSaathi AI · SIH26092 student prototype")}</p>
    </aside>
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
      <a href="/" className="mb-6 rounded-lg bg-white p-3 lg:hidden"><img src={logo} alt={t("SchemeSaathi AI home")} className="h-auto w-44 object-contain" /></a>
      <div className="w-full max-w-lg">{children}</div>
    </main>
  </div>;
}

function Feature({ text }) {
  return <div className="flex items-center gap-4"><span className="h-3 w-3 shrink-0 rounded-full bg-[#f4c63d]" /><span className="text-base text-slate-200">{text}</span></div>;
}
