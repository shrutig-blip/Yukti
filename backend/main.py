from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "GeM Compliance API is running"}