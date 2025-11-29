import type { Template } from "@/types/index";

export interface ITemplatesRepository {
  findAll(userEmail: string): Promise<Template[]>;
  findById(id: number): Promise<Template | null>;
  create(name: string, blobKey: string, userEmail: string): Promise<Template>;
  delete(id: number, userEmail: string): Promise<Template | null>;
  exists(id: number, userEmail?: string): Promise<boolean>;
}