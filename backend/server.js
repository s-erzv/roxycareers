import Fastify from 'fastify';
import rescreenRoutes from './routes/rescreen.js';

const fastify = Fastify({ logger: true });

// Register CORS to allow frontend to make requests
fastify.register(import('@fastify/cors'), { 
  origin: '*', // Ganti dengan URL frontend Anda di produksi
  methods: ['POST'],
});

// Register routes
fastify.register(rescreenRoutes);

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log(`Server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();