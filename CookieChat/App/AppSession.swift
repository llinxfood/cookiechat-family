import Foundation

@MainActor
final class AppSession: ObservableObject {
    @Published private(set) var userId: String?
    @Published private(set) var family: FamilyProfile?

    var isSignedIn: Bool { userId != nil }
    var currentRole: UserRole? {
        guard let userId else { return nil }
        return family?.role(for: userId)
    }

    #if DEBUG
    var isDemoAuthEnabled: Bool { true }
    #else
    var isDemoAuthEnabled: Bool { false }
    #endif

    func signInDemo(as role: UserRole) {
        guard isDemoAuthEnabled else { return }

        let idsByRole: [UserRole: String] = [
            .admin: "uid_mama",
            .adult: "uid_abuela",
            .child: "uid_hija"
        ]

        let demoMembers: [String: UserRole] = [
            "uid_mama": .admin,
            "uid_papa": .admin,
            "uid_abuela": .adult,
            "uid_abuelo": .adult,
            "uid_hija": .child
        ]

        let family = FamilyProfile(
            id: "family_demo_1",
            name: "Cookie Family",
            members: demoMembers,
            admins: ["uid_mama", "uid_papa"],
            status: "active"
        )

        self.userId = idsByRole[role]
        self.family = family
    }

    func signOut() {
        userId = nil
        family = nil
    }
}
