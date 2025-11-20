import connectToDatabase from '../db';
import Person, { IPerson } from '../models/Person';
import Quote, { IQuote } from '../models/Quote';
import { FilterQuery } from 'mongoose';

export class StorageService {
  
  async connect() {
    await connectToDatabase();
  }

  // Generic search for Persons
  async searchPersons(query: Record<string, any>) {
    await this.connect();
    const filter: FilterQuery<IPerson> = {};

    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        // Check if it looks like a "like" query (e.g. contains %) or just default to regex for partial match
        // For this example, we'll treat all string searches as case-insensitive partial matches ('like')
        // unless specified otherwise.
        filter[key] = { $regex: value, $options: 'i' };
      } else {
        // Exact match for non-strings (dates, booleans, numbers)
        filter[key] = value;
      }
    }

    return Person.find(filter).sort({ createdAt: -1 });
  }

  async createPerson(data: Partial<IPerson>) {
    await this.connect();
    return Person.create(data);
  }

  async getPerson(id: string) {
    await this.connect();
    return Person.findById(id);
  }

  // Generic search for Quotes
  async searchQuotes(query: Record<string, any>) {
    await this.connect();
    const filter: FilterQuery<IQuote> = {};

    for (const [key, value] of Object.entries(query)) {
      if (key === 'personId') {
         filter.person = value;
         continue;
      }

      if (typeof value === 'string') {
        filter[key] = { $regex: value, $options: 'i' };
      } else {
        filter[key] = value;
      }
    }

    return Quote.find(filter).populate('person').sort({ date: -1 });
  }

  async createQuote(data: Partial<IQuote>) {
    await this.connect();
    return Quote.create(data);
  }
}

export const storageService = new StorageService();
