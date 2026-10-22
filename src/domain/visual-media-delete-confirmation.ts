export function confirmVisualMediaDeletion(
  fileName: string,
  confirmAction: (message: string) => boolean = message => window.confirm(message)
): boolean {
  return confirmAction(`Excluir o arquivo “${fileName}”? Esta ação não pode ser desfeita e também removerá as referências deste arquivo no layout salvo.`);
}
