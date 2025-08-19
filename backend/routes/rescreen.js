// backend/routes/rescreen.js
import { runAutoScreening } from '../services/autoScreening.js';
import { supabase } from '../supabaseClient.js';

export default async function rescreenRoutes(fastify, options) {
  fastify.post('/rescreen-applicant', async (request, reply) => {
    const { applicant_id } = request.body;

    if (!applicant_id) {
      return reply.status(400).send({ error: 'applicant_id is required' });
    }

    try {
      // 1. Fetch applicant data
      const { data: applicant, error: applicantError } = await supabase
        .from('applicants')
        .select(`
          id,
          job_id,
          custom_answers
        `)
        .eq('id', applicant_id)
        .single();

      if (applicantError) {
        throw new Error('Failed to fetch applicant data: ' + applicantError.message);
      }

      // 2. Fetch job data for criteria
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select(`
          custom_fields
        `)
        .eq('id', applicant.job_id)
        .single();

      if (jobError) {
        throw new Error('Failed to fetch job data: ' + jobError.message);
      }

      // 3. Run the auto-screening logic
      const { status, log } = runAutoScreening(job.custom_fields, applicant.custom_answers);

      // 4. Update the applicant's status and log
      const { error: updateError } = await supabase
        .from('applicants')
        .update({
          auto_screening_status: status,
          auto_screening_log: log
        })
        .eq('id', applicant_id);

      if (updateError) {
        throw new Error('Failed to update applicant status: ' + updateError.message);
      }

      reply.send({ message: 'Auto-screening completed successfully.', newStatus: status });

    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });
}