
// Supabase Edge Function for Runway.ai API Integration
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.6';
import { corsHeaders } from '../_shared/cors.ts';

// Define types for Runway API responses
interface RunwayAsset {
  id: string;
  title: string;
  description: string | null;
  type: string;
  url: string;
  thumbnail_url: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

interface RunwayAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Get Supabase client using environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Initialize Supabase client with anonymous key for client-side operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize admin client with service role key for server-side operations
const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

// Runway API configuration
const RUNWAY_API_BASE_URL = 'https://api.runwayml.com/v1';
const RUNWAY_API_KEY = Deno.env.get('RUNWAY_API_KEY') || '';

// Request handler
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const requestData = await req.json();
    const { action, params = {} } = requestData;
    
    // Log request info
    console.log(`Runway API request: ${action}`, params);
    console.log(`Authenticated user: ${user.id}`);

    // Process different actions
    let result: RunwayAPIResponse;
    
    switch (action) {
      case 'authenticate':
        result = await authenticateWithRunway(user.id);
        break;
        
      case 'fetchUserAssets':
        result = await fetchUserAssets(user.id, params);
        break;
        
      case 'generateImage':
        result = await generateImage(user.id, params);
        break;
        
      case 'checkJobStatus':
        result = await checkJobStatus(params.jobId);
        break;
        
      default:
        result = { success: false, error: `Unknown action: ${action}` };
    }

    // Return response
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    // Handle errors
    console.error('Error in Runway edge function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Function to authenticate with Runway
async function authenticateWithRunway(userId: string): Promise<RunwayAPIResponse> {
  try {
    if (!RUNWAY_API_KEY) {
      console.error('RUNWAY_API_KEY is not set');
      return {
        success: false,
        error: 'API key not configured on the server'
      };
    }
    
    // For the initial implementation, we'll create a mock response for testing
    // In a production environment, we'd actually validate the API key with Runway
    
    return {
      success: true,
      data: {
        message: 'Authentication successful',
        user_id: userId,
        authenticated: true,
        // Include a timestamp so we know this is a fresh response
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: error.message || 'Authentication failed'
    };
  }
}

// Function to fetch user assets from Runway
async function fetchUserAssets(userId: string, options: any = {}): Promise<RunwayAPIResponse> {
  try {
    // In a production environment, we would make a call to the Runway API
    // For now, return mock data for development/testing
    
    // Generate some sample assets with timestamp and user ID to show it's dynamic
    const timestamp = new Date().toISOString();
    const mockAssets: RunwayAsset[] = Array.from({ length: 5 }, (_, i) => ({
      id: `asset-${i}-${Date.now()}`,
      title: `Sample Runway Asset ${i + 1}`,
      description: i % 2 === 0 ? `AI-generated image description ${i + 1}` : null,
      type: 'image',
      url: `https://picsum.photos/seed/${i + 1}/800/600`,
      thumbnail_url: `https://picsum.photos/seed/${i + 1}/200/200`,
      created_at: new Date(Date.now() - i * 86400000).toISOString(), // Dates spread out by days
      updated_at: timestamp,
      metadata: {
        prompt: `A beautiful landscape with mountains and trees, style ${i + 1}`,
        width: 800,
        height: 600,
        user_id: userId.substring(0, 8) // Include part of the user ID to show it's user-specific
      }
    }));
    
    return {
      success: true,
      data: {
        assets: mockAssets,
        pagination: {
          total: 25,
          page: options.page || 1,
          limit: options.limit || 10,
          has_more: true
        }
      }
    };
    
  } catch (error) {
    console.error('Error fetching user assets:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch assets'
    };
  }
}

// Function to generate an image using Runway
async function generateImage(userId: string, params: any): Promise<RunwayAPIResponse> {
  try {
    const { prompt, width = 512, height = 512 } = params;
    
    if (!prompt) {
      return {
        success: false,
        error: 'Prompt is required'
      };
    }
    
    // In a production environment, we would call the Runway API to initiate generation
    // For now, return a mock job that can be polled
    
    const jobId = `runway-job-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Store the job information for later retrieval
    // In production, we'd store this in a database
    // For demo purposes, we're returning info directly
    
    return {
      success: true,
      data: {
        jobId,
        status: 'queued',
        prompt,
        userId: userId.substring(0, 8), // Include part of the user ID to show it's user-specific
        createdAt: new Date().toISOString(),
        estimatedCompletionTime: new Date(Date.now() + 30000).toISOString() // 30 seconds from now
      }
    };
    
  } catch (error) {
    console.error('Error generating image:', error);
    return {
      success: false, 
      error: error.message || 'Failed to generate image'
    };
  }
}

// Function to check the status of a generation job
async function checkJobStatus(jobId: string): Promise<RunwayAPIResponse> {
  try {
    if (!jobId) {
      return {
        success: false,
        error: 'Job ID is required'
      };
    }
    
    // In a production environment, we would call the Runway API to check status
    // For now, simulate different states based on job ID
    
    // Extract timestamp from the job ID to create deterministic responses
    const timestampStr = jobId.split('-')[2];
    const timestamp = parseInt(timestampStr || '0', 10);
    const elapsedTime = Date.now() - timestamp;
    
    // Simulate job progression based on elapsed time
    if (elapsedTime < 5000) {
      return {
        success: true,
        data: {
          jobId,
          status: 'queued',
          progress: 0,
          message: 'Job is queued for processing'
        }
      };
    } else if (elapsedTime < 15000) {
      // Processing state
      const progress = Math.min(Math.floor((elapsedTime - 5000) / 100), 99);
      return {
        success: true,
        data: {
          jobId,
          status: 'processing',
          progress,
          message: `Processing image generation (${progress}%)`
        }
      };
    } else {
      // Completed state (random image from Picsum)
      const seed = parseInt(jobId.split('-')[3] || '1', 10);
      return {
        success: true,
        data: {
          jobId,
          status: 'completed',
          progress: 100,
          message: 'Image generation complete',
          result: {
            imageUrl: `https://picsum.photos/seed/${seed}/800/600`,
            thumbnailUrl: `https://picsum.photos/seed/${seed}/200/200`,
            completedAt: new Date().toISOString()
          }
        }
      };
    }
    
  } catch (error) {
    console.error('Error checking job status:', error);
    return {
      success: false,
      error: error.message || 'Failed to check job status'
    };
  }
}
