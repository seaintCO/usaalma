import { ReceptionistRepository } from "@/lib/db/repositories/receptionist/receptionist.repository";

export async function createReceptionistTool(
  userId:string,
  businessName:string,
  businessType:string,
  phoneNumber:string,
  greeting:string
) {
  const receptionist = await ReceptionistRepository.create(userId, {
    businessName,
    businessType,
    phoneNumber,
    greeting,
    language:"es",
  });

  return {
    success:true,
    message:`Recepcionista IA creada para ${receptionist.business_name}. Estado: ${receptionist.status}`,
    receptionist,
  };
}
