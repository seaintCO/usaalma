import { ContactRepository } from "@/lib/db/repositories/crm/contact.repository";

export async function createContactTool(userId:string, name:string, company?:string, email?:string, phone?:string) {
  const contact = await ContactRepository.create(userId, {
    name,
    company,
    email,
    phone,
    status: "prospecto",
  });

  return {
    success: true,
    message: `Contacto creado: ${contact.name}`,
    contact,
  };
}
