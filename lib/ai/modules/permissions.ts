import { ModuleRepository } from "@/lib/db/repositories/modules/module.repository";

export async function getInstalledModuleKeys(userId:string) {
  const modules = await ModuleRepository.list(userId);
  return modules.filter((m:any) => m.installed).map((m:any) => m.module_key);
}

export function userHasModule(installed:string[], moduleKey:string) {
  return installed.includes(moduleKey);
}
