import SwiftUI

struct SignInView: View {
    @EnvironmentObject private var session: AppSession

    var body: some View {
        VStack(spacing: 16) {
            Text("CookieChat")
                .font(.largeTitle)
                .bold()
            Text("Demo de acceso por rol")
                .foregroundStyle(.secondary)

            Button("Entrar como Madre (admin)") {
                session.signInDemo(as: .admin)
            }
            .buttonStyle(.borderedProminent)

            Button("Entrar como Abuela (adult)") {
                session.signInDemo(as: .adult)
            }
            .buttonStyle(.bordered)

            Button("Entrar como Hija (child)") {
                session.signInDemo(as: .child)
            }
            .buttonStyle(.bordered)
        }
        .padding()
    }
}
