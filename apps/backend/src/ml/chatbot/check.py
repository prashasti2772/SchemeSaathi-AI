# import pandas as pd

# df = pd.read_csv("myscheme.csv")

# print(df.columns)

# print(df.head(3))



# import pickle

# with open("documents.pkl", "rb") as f:
#     docs = pickle.load(f)





import pandas as pd

df = pd.read_csv("myscheme.csv")
print(df.columns.tolist())