import {createTask} from "../tools/planner/createTask";
import {createLead} from "../tools/crm/createLead";
import {createInvoice} from "../tools/invoice/createInvoice";
import {createEvent} from "../tools/calendar/createEvent";
import {saveMemory} from "../tools/memory/saveMemory";
import {installModule} from "../tools/marketplace/installModule";

export const ALMA_TOOLS={

createTask,

createLead,

createInvoice,

createEvent,

saveMemory,

installModule

};
