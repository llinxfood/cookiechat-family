import Foundation

#if canImport(FirebaseFirestore)
import FirebaseFirestore

struct FirestoreChatRepository: ChatRepository {
    private let db = Firestore.firestore()
    private let familyId: String

    init(familyId: String) {
        self.familyId = familyId
    }

    private var collection: CollectionReference {
        db.collection("families")
            .document(familyId)
            .collection("rooms")
            .document("family_main")
            .collection("messages")
    }

    func loadMessages() async throws -> [ChatMessage] {
        let snapshot = try await collection
            .order(by: "createdAt", descending: false)
            .limit(to: 200)
            .getDocuments()
        return snapshot.documents.compactMap { document in
            let data = document.data()
            guard
                let senderId = data["senderId"] as? String,
                let senderRoleValue = data["senderRole"] as? String,
                let senderRole = UserRole(rawValue: senderRoleValue),
                let text = data["text"] as? String,
                let type = data["type"] as? String,
                let createdAt = data["createdAt"] as? Timestamp
            else {
                return nil
            }

            return ChatMessage(
                id: document.documentID,
                senderId: senderId,
                senderRole: senderRole,
                text: text,
                createdAt: createdAt.dateValue(),
                type: type
            )
        }
    }

    func sendText(_ text: String, senderId: String, senderRole: UserRole) async throws {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.count <= 1000 else { return }

        try await collection.addDocument(data: [
            "senderId": senderId,
            "senderRole": senderRole.rawValue,
            "text": trimmed,
            "createdAt": Timestamp(date: Date()),
            "type": "text"
        ])
    }
}
#endif
