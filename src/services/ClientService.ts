import type { Prisma } from "@database/prisma";
import type { ClientSummary } from "@repositories/ClientRepository";
import type { UpdateClientBody } from "@schemas/client.schema";
import { ClientRepository } from "@repositories/ClientRepository";
import { AppError } from "@utils/AppError";

export class ClientService {
  private clientRepository = new ClientRepository();

  async registerClient(data: Prisma.ClientCreateInput): Promise<ClientSummary> {
    const clientExists = await this.clientRepository.findByEin(data.ein);

    if (clientExists) {
      throw new AppError('Este EIN ja esta em uso.', 400); // 400 Bad Request
    }

    return this.clientRepository.create(data);
  }

  async getAllClients(): Promise<ClientSummary[]> {
    return this.clientRepository.findAll();
  }

  async updateClient(clientId: number, data: UpdateClientBody): Promise<ClientSummary> {
    const clientExists = await this.clientRepository.findById(clientId);

    if (!clientExists) {
      throw new AppError('Cliente não encontrado.', 404);
    }

    // Verifica se o ein foi alterado e se o novo ein ja existe
    if(data.ein && String(data.ein) !== clientExists.ein) {
      const einExists = await this.clientRepository.findByEin(data.ein);
      
      if (einExists) {
        throw new AppError('Este EIN ja esta em uso.', 400); // 400 Bad Request
      }
    }

    return this.clientRepository.update(clientId, data);
  }

  async getByID(clientId: number): Promise<ClientSummary> {
    const client = await this.clientRepository.findById(clientId);

    if (!client) {
      throw new AppError('Cliente não encontrado.', 404);
    }

    return client;
  }

  async delete(clientId: number): Promise<ClientSummary> {
    const client = await this.clientRepository.findById(clientId);

    if (!client) {
      throw new AppError('Cliente não encontrado.', 404);
    }
    return this.clientRepository.delete(clientId);
  }
}
