#!/usr/bin/env node

/**
 * Question Seed Script
 * 
 * This script generates trivia questions using AWS Bedrock or mock data.
 * It creates 100 questions per category and inserts them into the database.
 * 
 * Requirements: 7
 * 
 * Usage:
 *   # With Bedrock (requires AWS credentials)
 *   AWS_PROFILE=your-profile DATABASE_URL=postgresql://... pnpm tsx scripts/seed-questions.ts
 * 
 *   # With mock data (for development)
 *   BEDROCK_ENABLED=false DATABASE_URL=postgresql://... pnpm tsx scripts/seed-questions.ts
 */

import { Pool } from 'pg';
import { createHash } from 'crypto';

// Check if Bedrock is available
const BEDROCK_ENABLED = process.env.BEDROCK_ENABLED !== 'false';
const QUESTIONS_PER_CATEGORY = parseInt(process.env.QUESTIONS_PER_CATEGORY || '100');

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

/**
 * Generate questions using AWS Bedrock
 */
async function generateQuestionsWithBedrock(
  category: string,
  count: number
): Promise<Question[]> {
  try {
    const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
    
    const client = new BedrockRuntimeClient({ region: 'us-east-1' });
    
    const prompt = `Generate ${count} trivia questions for the category: ${category}

Requirements:
- Difficulty: Medium
- Format: Multiple choice with 4 options (A, B, C, D)
- Include one correct answer
- Provide a brief explanation for the correct answer
- Ensure questions are factually accurate
- Avoid ambiguous wording
- Make questions engaging and educational

Output as a JSON array with this exact structure:
[
  {
    "question": "What is the capital of France?",
    "options": ["London", "Paris", "Berlin", "Madrid"],
    "correctIndex": 1,
    "explanation": "Paris is the capital and largest city of France."
  }
]

Generate exactly ${count} questions. Return only the JSON array, no other text.`;

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    console.log(`   🤖 Calling Bedrock for ${category}...`);
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Extract JSON from response
    const content = responseBody.content[0].text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('No JSON array found in Bedrock response');
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    console.log(`   ✓ Generated ${questions.length} questions via Bedrock`);
    
    return questions;
  } catch (error) {
    console.warn(`   ⚠️  Bedrock generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log(`   📝 Falling back to mock questions`);
    return generateMockQuestions(category, count);
  }
}

/**
 * Generate mock questions for development
 */
function generateMockQuestions(category: string, count: number): Question[] {
  const mockQuestions: Record<string, Question[]> = {
    science: [
      {
        question: 'What is the chemical symbol for gold?',
        options: ['Go', 'Au', 'Gd', 'Ag'],
        correctIndex: 1,
        explanation: 'Au is the chemical symbol for gold, derived from the Latin word "aurum".',
      },
      {
        question: 'What is the speed of light in vacuum?',
        options: ['299,792 km/s', '150,000 km/s', '500,000 km/s', '1,000,000 km/s'],
        correctIndex: 0,
        explanation: 'The speed of light in vacuum is approximately 299,792 kilometers per second.',
      },
      {
        question: 'What is the largest planet in our solar system?',
        options: ['Saturn', 'Neptune', 'Jupiter', 'Uranus'],
        correctIndex: 2,
        explanation: 'Jupiter is the largest planet in our solar system with a diameter of about 143,000 km.',
      },
    ],
    history: [
      {
        question: 'In which year did World War II end?',
        options: ['1943', '1944', '1945', '1946'],
        correctIndex: 2,
        explanation: 'World War II ended in 1945 with the surrender of Japan in September.',
      },
      {
        question: 'Who was the first President of the United States?',
        options: ['Thomas Jefferson', 'George Washington', 'John Adams', 'Benjamin Franklin'],
        correctIndex: 1,
        explanation: 'George Washington served as the first President of the United States from 1789 to 1797.',
      },
    ],
    geography: [
      {
        question: 'What is the capital of Australia?',
        options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
        correctIndex: 2,
        explanation: 'Canberra is the capital city of Australia, located in the Australian Capital Territory.',
      },
      {
        question: 'Which is the longest river in the world?',
        options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'],
        correctIndex: 1,
        explanation: 'The Nile River is generally considered the longest river in the world at about 6,650 km.',
      },
    ],
    sports: [
      {
        question: 'How many players are on a basketball team on the court?',
        options: ['4', '5', '6', '7'],
        correctIndex: 1,
        explanation: 'A basketball team has 5 players on the court at a time.',
      },
      {
        question: 'In which sport would you perform a slam dunk?',
        options: ['Volleyball', 'Basketball', 'Tennis', 'Baseball'],
        correctIndex: 1,
        explanation: 'A slam dunk is a basketball shot where a player jumps and forcefully puts the ball through the hoop.',
      },
    ],
    arts: [
      {
        question: 'Who painted the Mona Lisa?',
        options: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello'],
        correctIndex: 1,
        explanation: 'Leonardo da Vinci painted the Mona Lisa in the early 16th century.',
      },
      {
        question: 'What art movement is Salvador Dalí associated with?',
        options: ['Cubism', 'Impressionism', 'Surrealism', 'Pop Art'],
        correctIndex: 2,
        explanation: 'Salvador Dalí was a prominent figure in the Surrealist movement.',
      },
    ],
    entertainment: [
      {
        question: 'Which movie won the Academy Award for Best Picture in 1994?',
        options: ['Pulp Fiction', 'Forrest Gump', 'The Shawshank Redemption', 'The Lion King'],
        correctIndex: 1,
        explanation: 'Forrest Gump won the Academy Award for Best Picture in 1994.',
      },
      {
        question: 'Who directed the movie "Inception"?',
        options: ['Steven Spielberg', 'Christopher Nolan', 'James Cameron', 'Quentin Tarantino'],
        correctIndex: 1,
        explanation: 'Christopher Nolan directed Inception, released in 2010.',
      },
    ],
    technology: [
      {
        question: 'What does CPU stand for?',
        options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Computer Processing Unit'],
        correctIndex: 0,
        explanation: 'CPU stands for Central Processing Unit, the primary component of a computer that performs instructions.',
      },
      {
        question: 'In what year was the first iPhone released?',
        options: ['2005', '2006', '2007', '2008'],
        correctIndex: 2,
        explanation: 'The first iPhone was released by Apple in 2007.',
      },
    ],
    literature: [
      {
        question: 'Who wrote "Romeo and Juliet"?',
        options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
        correctIndex: 1,
        explanation: 'William Shakespeare wrote the tragedy "Romeo and Juliet" in the 1590s.',
      },
      {
        question: 'What is the first book in the Harry Potter series?',
        options: ['Chamber of Secrets', 'Prisoner of Azkaban', 'Philosopher\'s Stone', 'Goblet of Fire'],
        correctIndex: 2,
        explanation: 'Harry Potter and the Philosopher\'s Stone (or Sorcerer\'s Stone in the US) is the first book.',
      },
    ],
    general: [
      {
        question: 'How many continents are there?',
        options: ['5', '6', '7', '8'],
        correctIndex: 2,
        explanation: 'There are 7 continents: Africa, Antarctica, Asia, Europe, North America, Oceania, and South America.',
      },
      {
        question: 'What is the largest ocean on Earth?',
        options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
        correctIndex: 3,
        explanation: 'The Pacific Ocean is the largest ocean, covering about 46% of Earth\'s water surface.',
      },
    ],
  };

  const baseQuestions = mockQuestions[category.toLowerCase()] || mockQuestions.general;
  const questions: Question[] = [];

  // Generate variations to reach the desired count
  for (let i = 0; i < count; i++) {
    const baseQuestion = baseQuestions[i % baseQuestions.length];
    const variation = Math.floor(i / baseQuestions.length);
    
    questions.push({
      ...baseQuestion,
      question: variation > 0 
        ? `${baseQuestion.question} (Variation ${variation})`
        : baseQuestion.question,
    });
  }

  return questions;
}

/**
 * Calculate SHA256 hash for question deduplication
 */
function calculateQuestionHash(question: Question): string {
  const content = JSON.stringify({
    question: question.question.toLowerCase().trim(),
    options: question.options.map(o => o.toLowerCase().trim()).sort(),
  });
  
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Insert questions into database
 */
async function insertQuestions(
  pool: Pool,
  categoryId: string,
  questions: Question[]
): Promise<number> {
  let inserted = 0;
  let skipped = 0;

  for (const question of questions) {
    const hash = calculateQuestionHash(question);

    try {
      // Check if question already exists
      const existingResult = await pool.query(
        'SELECT id FROM questions WHERE hash = $1',
        [hash]
      );

      if (existingResult.rows.length > 0) {
        skipped++;
        continue;
      }

      // Insert question
      await pool.query(
        `INSERT INTO questions (
          category_id, text, options, correct_index, 
          explanation, source, hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          categoryId,
          question.question,
          JSON.stringify(question.options),
          question.correctIndex,
          question.explanation,
          BEDROCK_ENABLED ? 'bedrock' : 'manual',
          hash,
        ]
      );

      inserted++;
    } catch (error) {
      console.error(`   ❌ Error inserting question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (skipped > 0) {
    console.log(`   ⏭️  Skipped ${skipped} duplicate questions`);
  }

  return inserted;
}

/**
 * Main seed function
 */
async function seedQuestions() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('🚀 Starting question seed...\n');
    
    if (BEDROCK_ENABLED) {
      console.log('🤖 Using AWS Bedrock for question generation');
    } else {
      console.log('📝 Using mock questions (BEDROCK_ENABLED=false)');
    }
    
    console.log(`📊 Generating ${QUESTIONS_PER_CATEGORY} questions per category\n`);

    // Get categories
    const categoriesResult = await pool.query(
      'SELECT id, name, slug FROM categories ORDER BY display_order'
    );
    const categories: Category[] = categoriesResult.rows;

    console.log(`📦 Found ${categories.length} categories\n`);

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const category of categories) {
      console.log(`📝 Processing ${category.name} (${category.slug})...`);

      // Check existing questions
      const existingResult = await pool.query(
        'SELECT COUNT(*) as count FROM questions WHERE category_id = $1',
        [category.id]
      );
      const existingCount = parseInt(existingResult.rows[0].count);

      if (existingCount >= QUESTIONS_PER_CATEGORY) {
        console.log(`   ✓ Already has ${existingCount} questions, skipping\n`);
        totalSkipped += existingCount;
        continue;
      }

      // Generate questions
      const questions = BEDROCK_ENABLED
        ? await generateQuestionsWithBedrock(category.name, QUESTIONS_PER_CATEGORY)
        : generateMockQuestions(category.slug, QUESTIONS_PER_CATEGORY);

      // Insert questions
      const inserted = await insertQuestions(pool, category.id, questions);
      totalInserted += inserted;

      console.log(`   ✓ Inserted ${inserted} new questions\n`);
    }

    console.log(`✅ Question seed complete!`);
    console.log(`   Total questions inserted: ${totalInserted}`);
    console.log(`   Total questions in database: ${totalInserted + totalSkipped}\n`);

    // Show summary by category
    const summaryResult = await pool.query(`
      SELECT c.name, COUNT(q.id) as count
      FROM categories c
      LEFT JOIN questions q ON q.category_id = c.id
      GROUP BY c.name
      ORDER BY c.name
    `);

    console.log('📊 Questions per category:');
    for (const row of summaryResult.rows) {
      console.log(`   ${row.name}: ${row.count}`);
    }
    console.log();

  } catch (error) {
    console.error('❌ Error seeding questions:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the seed script
seedQuestions();
