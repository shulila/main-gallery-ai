
import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(100, 'Email must be less than 100 characters');

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

/**
 * User credentials validation schema
 */
export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Platform URL validation schema
 */
export const platformUrlSchema = z
  .string()
  .url('Invalid URL')
  .refine(
    (url) => {
      const supportedDomains = [
        'midjourney.com',
        'openai.com',
        'leonardo.ai',
        'runwayml.com',
        'pika.art',
        'krea.ai',
        'firefly.adobe.com',
        // Add more supported domains as needed
      ];
      
      return supportedDomains.some(domain => url.includes(domain));
    },
    {
      message: 'URL must be from a supported AI image platform',
    }
  );

/**
 * Image data validation schema
 */
export const imageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  alt: z.string().optional(),
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
  platform: z.string(),
  timestamp: z.number(),
  pageUrl: z.string().url('Invalid page URL'),
  metadata: z.object({
    prompt: z.string().optional(),
    author: z.string().optional(),
    date: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

/**
 * Validate data against a schema
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validation result
 */
export function validate<T>(schema: z.ZodType<T>, data: unknown): {
  success: boolean;
  data?: T;
  error?: string;
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => e.message).join(', '),
      };
    }
    return { success: false, error: 'Validation failed' };
  }
}
