import { Request, Response } from 'express';
import Person from '../models/Person';
import {
  calculateNameSimilarity,
  normalizeName,
  DEFAULT_SIMILARITY_THRESHOLD,
  SimilarityMatch
} from '../utils/nameMatching';

export interface PersonSimilarityMatch extends SimilarityMatch {
  personId: string;
  aliases: string[];
}

/**
 * Find persons with similar names using fuzzy matching.
 * Searches both name and aliases fields.
 * 
 * @param searchName The name to search for
 * @param threshold Similarity threshold (default 0.85)
 * @returns Array of matching persons with similarity scores, sorted by similarity
 */
export const findSimilarPersons = async (
  searchName: string,
  threshold = DEFAULT_SIMILARITY_THRESHOLD
): Promise<PersonSimilarityMatch[]> => {
  const timeout = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '30000', 10);

  // Get all persons - we need to do similarity matching in memory
  // For large datasets, consider adding a normalizedName field to the schema
  const allPersons = await Person.find({})
    .select('name aliases')
    .maxTimeMS(timeout);

  const matches: PersonSimilarityMatch[] = [];

  for (const person of allPersons) {
    // Check similarity with the main name
    const nameSimilarity = calculateNameSimilarity(searchName, person.name);

    // Check similarity with aliases
    let bestAliasSimilarity = 0;
    let bestAliasMatch = '';
    for (const alias of person.aliases || []) {
      const aliasSimilarity = calculateNameSimilarity(searchName, alias);
      if (aliasSimilarity > bestAliasSimilarity) {
        bestAliasSimilarity = aliasSimilarity;
        bestAliasMatch = alias;
      }
    }

    // Use the best similarity score
    const bestSimilarity = Math.max(nameSimilarity, bestAliasSimilarity);
    const matchedName = nameSimilarity >= bestAliasSimilarity ? person.name : bestAliasMatch;
    const normalizedSearch = normalizeName(searchName);
    const isExact = normalizeName(matchedName) === normalizedSearch;

    if (bestSimilarity >= threshold || isExact) {
      matches.push({
        personId: person._id.toString(),
        name: person.name,
        aliases: person.aliases || [],
        similarity: bestSimilarity,
        isExact,
      });
    }
  }

  // Sort by similarity (highest first), with exact matches at the top
  return matches.sort((a, b) => {
    if (a.isExact && !b.isExact) return -1;
    if (!a.isExact && b.isExact) return 1;
    return b.similarity - a.similarity;
  });
};

/**
 * Find a single best matching person, or null if no match above threshold.
 * 
 * @param searchName The name to search for
 * @param threshold Similarity threshold (default 0.85)
 * @returns The best matching person or null
 */
export const findBestMatchingPerson = async (
  searchName: string,
  threshold = DEFAULT_SIMILARITY_THRESHOLD
): Promise<PersonSimilarityMatch | null> => {
  const matches = await findSimilarPersons(searchName, threshold);
  return matches.length > 0 ? matches[0] : null;
};

/**
 * Get or create a person by name, reusing existing person if similar name exists.
 * 
 * @param name The person's name
 * @param threshold Similarity threshold for matching (default 0.85)
 * @returns The existing or newly created person document
 */
export const getOrCreatePersonByName = async (
  name: string,
  threshold = DEFAULT_SIMILARITY_THRESHOLD
): Promise<{ person: any; isNew: boolean; matchedVia?: string }> => {
  // First, try to find a similar existing person
  const match = await findBestMatchingPerson(name, threshold);

  if (match) {
    const person = await Person.findById(match.personId);
    if (person) {
      // If the name is slightly different but similar, add it as an alias
      const normalizedSearch = normalizeName(name);
      const normalizedName = normalizeName(person.name);
      const aliasesNormalized = (person.aliases || []).map(normalizeName);

      if (normalizedSearch !== normalizedName && !aliasesNormalized.includes(normalizedSearch)) {
        // Add the new name variation as an alias if it's not already there
        if (!person.aliases.includes(name)) {
          person.aliases.push(name);
          await person.save();
        }
      }

      return {
        person,
        isNew: false,
        matchedVia: match.isExact ? 'exact' : 'similar'
      };
    }
  }

  // No match found, create new person
  const newPerson = new Person({ name, aliases: [] });
  await newPerson.save();

  return { person: newPerson, isNew: true };
};

export const createPerson = async (req: Request, res: Response) => {
  try {
    const { name, firstname, surname, aliases, links, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const person = new Person({
      name,
      firstname,
      surname,
      aliases: aliases || [],
      links: links || [],
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

import { escapeRegExp } from '../utils/escape';

export const getPeople = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      const searchSafe = escapeRegExp(search as string);
      const searchRegex = new RegExp(searchSafe, 'i');
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
    const { name, firstname, surname, aliases, links, description } = req.body;

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
        links: links || [],
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
