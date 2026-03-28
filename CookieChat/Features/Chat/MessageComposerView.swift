import SwiftUI

struct MessageComposerView: View {
    @Binding var draft: String
    let onSend: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            TextField("Escribe un mensaje...", text: $draft)
                .textFieldStyle(.roundedBorder)

            Button("Enviar", action: onSend)
                .buttonStyle(.borderedProminent)
                .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
    }
}
