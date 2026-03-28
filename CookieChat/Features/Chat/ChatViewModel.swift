import Foundation

@MainActor
final class ChatViewModel: ObservableObject {
    @Published private(set) var messages: [ChatMessage] = []
    @Published var draft: String = ""
    @Published var errorText: String?

    private let repository: ChatRepository
    private let session: AppSession

    init(repository: ChatRepository, session: AppSession) {
        self.repository = repository
        self.session = session
    }

    func load() async {
        do {
            messages = try await repository.loadMessages()
        } catch {
            errorText = "No se pudieron cargar mensajes"
        }
    }

    func send() async {
        let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty,
              let senderId = session.userId,
              let senderRole = session.currentRole else { return }

        do {
            try await repository.sendText(trimmed, senderId: senderId, senderRole: senderRole)
            draft = ""
            messages = try await repository.loadMessages()
        } catch {
            errorText = "No se pudo enviar el mensaje"
        }
    }
}
