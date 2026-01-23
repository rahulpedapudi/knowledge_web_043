from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings

settings = get_settings()

client: AsyncIOMotorClient = None
db = None


async def connect_to_mongo():
    global client, db
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.database_name]
    print(f"Connected to MongoDB: {settings.database_name}")


async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("Closed MongoDB connection")


def get_database():
    return db
