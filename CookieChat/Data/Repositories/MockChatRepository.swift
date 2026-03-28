import Foundation

actor MockChatStore {
    static let shared = MockChatStore()

    private var messages: [ChatMessage] = [
        ChatMessage(
            id: UUID().uuidString,
            senderId: "uid_mama",
            senderRole: .admin,
            text: "Bienvenida a CookieChat",
            createdAt: Date().addingTimeInterval(-1800),
            type: "text"
        )
    ]

    func all() -> [ChatMessage] {
        messages.sorted { $0.createdAt < $1.createdAt }
    }

    func append(_ message: ChatMessage) {
        messages.append(message)
    }
}

struct MockChatRepository: ChatRepository {
    func loadMessages() async throws -> [ChatMessage] {
        await MockChatStore.shared.all()
    }

    func sendText(_ text: String, senderId: String, senderRole: UserRole) async throws {
        let message = ChatMessage(
            id: UUID().uuidString,
            senderId: senderId,
            senderRole: senderRole,
            text: text,
            createdAt: Date(),
            type: "text"
        )
        await MockChatStore.shared.append(message)
    }
}
