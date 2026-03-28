import SwiftUI

struct ParentPanelView: View {
    let family: FamilyProfile

    var body: some View {
        Form {
            Section("Familia") {
                Text(family.name)
                Text("Estado: \(family.status)")
            }

            Section("Miembros") {
                ForEach(family.members.keys.sorted(), id: \.self) { uid in
                    if let role = family.members[uid] {
                        HStack {
                            Text(uid)
                            Spacer()
                            Text(role.rawValue)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            Section("Nota") {
                Text("En produccion, aqui iran acciones admin: activar/desactivar miembros y pausar chat.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Panel Padres")
    }
}
