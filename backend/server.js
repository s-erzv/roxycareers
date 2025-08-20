import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { supabase } from './supabaseClient.js';
import { runAutoScreening, preprocessAnswers } from './services/autoScreening.js';

// Load .env
dotenv.config();

const fastify = Fastify({ logger: true });

// Register CORS
await fastify.register(cors, { 
  origin: '*', 
  methods: ['GET', 'POST'],
});

// ===================== ROUTES =====================

// POST /apply -> kandidat apply
fastify.post('/apply', async (request, reply) => {
  try {
    const { 
      name, 
      email, 
      job_id, 
      user_id, 
      uploadedFiles, 
      company, 
      custom_answers 
    } = request.body;

    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('custom_fields, title')
      .eq('id', job_id)
      .single();

    if (jobError || !jobData) {
      return reply.status(404).send({ error: 'Job not found' });
    }

    let screeningResult = null;
    let autoScreeningStatus = 'Belum Diproses'; // Status screening default
    let applicantStatus = 'Applied'; // Status utama applicant default

    // Jalankan auto-screening kalau ada custom_fields
    if (jobData.custom_fields && jobData.custom_fields.length > 0 && custom_answers) {
      const processedAnswers = preprocessAnswers(jobData.custom_fields, custom_answers);
      screeningResult = runAutoScreening(jobData.custom_fields, processedAnswers);

      autoScreeningStatus = screeningResult.status;

      // Logika untuk menentukan status utama berdasarkan hasil screening
      if (screeningResult.status === 'Lolos') {
        applicantStatus = 'Shortlisted';
      } else if (screeningResult.status === 'Tidak Lolos') {
        applicantStatus = 'Rejected';
      } else {
        applicantStatus = 'Needs Review';
      }
    }

    // Pastikan data yang dikirim ke Supabase valid
    fastify.log.info({
      uploadedFiles: uploadedFiles,
      custom_answers: custom_answers,
      auto_screening_log: screeningResult ? screeningResult.log : {}
    });

    // Insert applicant ke DB
    const { data: applicantData, error: applicantError } = await supabase
      .from('applicants')
      .insert({
        name,
        email,
        job_id,
        user_id,
        uploaded_files: uploadedFiles,
        company,
        custom_answers,
        auto_screening_status: autoScreeningStatus,
        auto_screening_log: screeningResult ? screeningResult.log : {},
        status: applicantStatus // Gunakan status yang sudah dipetakan
      })
      .select()
      .single();

    if (applicantError) {
      fastify.log.error('Supabase insert error:', applicantError);
      return reply.status(500).send({ error: 'Failed to submit application' });
    }

    return reply.send({
      message: 'Application submitted successfully',
      applicantId: applicantData.id,
      screeningResult,
      auto_screening_status: autoScreeningStatus,
      applicant_status: applicantStatus
    });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// POST /test-screening -> buat testing screening manual
fastify.post('/test-screening', async (request, reply) => {
  try {
    const { job_id, test_answers } = request.body;

    const { data: jobData, error } = await supabase
      .from('jobs')
      .select('custom_fields, title')
      .eq('id', job_id)
      .single();

    if (error || !jobData) {
      return reply.status(404).send({ error: 'Job not found' });
    }

    if (!jobData.custom_fields || jobData.custom_fields.length === 0) {
      return reply.send({ message: 'No screening criteria defined for this job' });
    }

    const processedAnswers = preprocessAnswers(jobData.custom_fields, test_answers);
    const screeningResult = runAutoScreening(jobData.custom_fields, processedAnswers);

    return reply.send({
      job_title: jobData.title,
      original_answers: test_answers,
      processed_answers: processedAnswers,
      screening_result: screeningResult
    });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// ===================== START SERVER =====================
const start = async () => {
  try {
    if (!process.env.SUPABASE_URL) {
      throw new Error('Supabase client is not configured correctly. SUPABASE_URL is missing.');
    }
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log(`🚀 Server listening on http://localhost:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();