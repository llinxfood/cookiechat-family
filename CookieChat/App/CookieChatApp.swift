import SwiftUI

@main
struct CookieChatApp: App {
    @StateObject private var session = AppSession()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)
        }
    }
}

private struct RootView: View {
    @EnvironmentObject private var session: AppSession

    private var repository: ChatRepository {
        // Cambiar a FirestoreChatRepository(familyId:) cuando Firebase este configurado.
        MockChatRepository()
    }

    var body: some View {
        Group {
            if session.isSignedIn {
                FamilyChatView(repository: repository, session: session)
            } else {
                SignInView()
            }
        }
    }
}
