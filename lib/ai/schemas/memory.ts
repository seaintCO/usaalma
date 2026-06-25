export interface MemoryItem{
  category:string;
  key:string;
  value:string;
  importance:number;
}

export interface MemoryExtraction{
  memories:MemoryItem[];
}
