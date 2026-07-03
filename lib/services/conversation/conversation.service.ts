import { ConversationRepository } from "@/lib/db/repositories/conversation.repository";

export class ConversationService {
  static async newChat(userId: string) {
    return await ConversationRepository.create(userId, "Nueva conversación");
  }

  static async history(userId: string) {
    return await ConversationRepository.list(userId);
  }
}
