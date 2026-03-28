import Foundation

struct ChatMessage: Identifiable, Codable, Equatable {
    let id: String
    let senderId: String
    let senderRole: UserRole
    let text: String
    let createdAt: Date
    let type: String
}
