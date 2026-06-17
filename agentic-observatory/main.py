from fastapi import FastAPI

app = FastAPI(
    title="Github Backup Observation Agent",
    version="1.0.0"
)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)