import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..","data", "data")

bidders_df = pd.read_csv(os.path.join(DATA_DIR, "bidders.csv"))
tender_criteria_df = pd.read_csv(os.path.join(DATA_DIR, "tender_criteria.csv"))
tender_bids_df = pd.read_csv(os.path.join(DATA_DIR, "tender_bids.csv"))


def get_bidder_by_id(bidder_id: str):
    row = bidders_df[bidders_df["bidder_id"] == bidder_id]
    if row.empty:
        return None
    return row.iloc[0].to_dict()

if __name__ == "__main__":
    print(bidders_df.head())
    print(get_bidder_by_id("BID00001")) 