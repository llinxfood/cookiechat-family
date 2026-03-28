import Foundation

protocol ChatRepository {
    func loadMessages() async throws -> [ChatMessage]
    func sendText(_ text: String, senderId: String, senderRole: UserRole) async throws
}
