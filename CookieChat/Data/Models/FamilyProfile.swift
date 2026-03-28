import Foundation

struct FamilyProfile: Identifiable, Codable {
    let id: String
    let name: String
    let members: [String: UserRole]
    let admins: Set<String>
    let status: String

    func role(for userId: String) -> UserRole? {
        members[userId]
    }

    func isAdmin(_ userId: String) -> Bool {
        admins.contains(userId)
    }
}
