import SwiftUI

struct FamilyChatView: View {
    @EnvironmentObject private var session: AppSession
    @StateObject private var viewModel: ChatViewModel

    init(repository: ChatRepository, session: AppSession) {
        _viewModel = StateObject(wrappedValue: ChatViewModel(repository: repository, session: session))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                List(viewModel.messages) { message in
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(message.senderRole.rawValue.uppercased()) · \(message.senderId)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(message.text)
                    }
                    .padding(.vertical, 4)
                }
                .listStyle(.plain)

                MessageComposerView(draft: $viewModel.draft) {
                    Task { await viewModel.send() }
                }
                .padding(.horizontal)
                .padding(.bottom, 8)

                if let errorText = viewModel.errorText {
                    Text(errorText)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .padding(.bottom, 8)
                }
            }
            .navigationTitle("Chat Familiar")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Salir") { session.signOut() }
                }

                if let family = session.family,
                   let userId = session.userId,
                   family.isAdmin(userId) {
                    ToolbarItem(placement: .topBarTrailing) {
                        NavigationLink("Padres") {
                            ParentPanelView(family: family)
                        }
                    }
                }
            }
        }
        .task { await viewModel.load() }
    }
}
