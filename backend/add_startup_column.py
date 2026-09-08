import pandas as pd
from datetime import datetime
path = "../data/data/bidders.csv"

df = pd.read_csv(path)

df["registration_date"] = pd.to_datetime(df["registration_date"])
cutoff = pd.Timestamp(datetime.now()) - pd.DateOffset(years=10)

df["is_startup"] = df["registration_date"] > cutoff

df.to_csv(path, index=False)

print(df[["bidder_id", "registration_date", "is_startup"]].head(10))