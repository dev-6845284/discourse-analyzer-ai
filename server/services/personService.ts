import { Request, Response } from 'express';
import Person from '../models/Person';

export const createPerson = async (req: Request, res: Response) => {
  try {
    const { name, firstname, surname, aliases, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const person = new Person({
      name,
      firstname,
      surname,
      aliases: aliases || [],
      description,
    });

    const timeout = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '30000', 10);

    await Promise.race([
      person.save(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Save operation timed out')), timeout)
      ),
    ]);

    res.status(201).json(person);
  } catch (error: any) {
    console.error('Error creating person:', error);
    res.status(500).json({ error: 'Failed to create person', details: error.message });
  }
};

export const getPeople = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query = {
        $or: [
          { name: searchRegex },
          { aliases: searchRegex },
        ],
      };
    }

    const timeout = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '30000', 10);

    const people = await Person.find(query)
      .sort({ name: 1 })
      .limit(50)
      .maxTimeMS(timeout);

    res.json(people);
  } catch (error: any) {
    console.error('Error fetching people:', error);
    res.status(500).json({ error: 'Failed to fetch people', details: error.message });
  }
};

export const updatePerson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, firstname, surname, aliases, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const timeout = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '30000', 10);

    const person = await Person.findByIdAndUpdate(
      id,
      {
        name,
        firstname,
        surname,
        aliases: aliases || [],
        description,
      },
      { new: true, runValidators: true }
    ).maxTimeMS(timeout);

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    res.json(person);
  } catch (error: any) {
    console.error('Error updating person:', error);
    res.status(500).json({ error: 'Failed to update person', details: error.message });
  }
};

export const deletePerson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const timeout = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '30000', 10);
    
    const person = await Person.findByIdAndDelete(id).maxTimeMS(timeout);

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    res.json({ message: 'Person deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting person:', error);
    res.status(500).json({ error: 'Failed to delete person', details: error.message });
  }
};
