
import asyncio
from database import get_database, connect_to_mongo, close_mongo_connection
from bson import ObjectId

async def verify_latest_document():
    await connect_to_mongo()
    db = get_database()
    
    # Get latest document
    cursor = db.documents.find().sort("_id", -1).limit(1)
    docs = []
    async for doc in cursor:
        docs.append(doc)
        
    if not docs:
        print("No documents found.")
        return

    latest_doc = docs[0]
    doc_id = str(latest_doc["_id"])
    print(f"Latest Document: {latest_doc.get('title', 'Untitled')} ({doc_id})")
    print(f"Processed: {latest_doc.get('processed')}")
    
    # Count concepts
    concept_count = await db.concepts.count_documents({"document_id": doc_id})
    print(f"Concepts found in DB: {concept_count}")
    
    # List a few concepts to see structure
    async for c in db.concepts.find({"document_id": doc_id}).limit(3):
        print(f" - Concept: {c.get('label')} (ID: {c.get('id')})") # Check if 'id' field exists or if it's just _id

    # Count relationships
    rel_count = await db.relationships.count_documents({"document_id": doc_id})
    print(f"Relationships found in DB: {rel_count}")
    
    # List a few relationships
    async for r in db.relationships.find({"document_id": doc_id}).limit(3):
        print(f" - Rel: {r.get('source_concept_id')} -> {r.get('target_concept_id')} ({r.get('relationship_type')})")

    await close_mongo_connection()

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(verify_latest_document())
