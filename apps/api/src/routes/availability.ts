import type { FastifyInstance, FastifyRequest } from "fastify";

function meta(request: FastifyRequest) {
  return { requestId: request.id, correlationId: request.id };
}

const SLOTS = [
  { period: "morning", time: "09:00", label: "9:00 AM", available: true },
  { period: "afternoon", time: "14:00", label: "2:00 PM", available: true },
  { period: "evening", time: "18:00", label: "6:00 PM", available: true },
  { period: "evening", time: "18:30", label: "6:30 PM", available: true },
  { period: "evening", time: "19:00", label: "7:00 PM", available: true },
] as const;

export async function registerAvailabilityRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { date?: string } }>(
    "/api/v1/availability/slots",
    async (request, reply) => {
      const date = request.query.date;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return reply.status(400).send({
          code: "VALIDATION_FAILED",
          message: "A YYYY-MM-DD date is required.",
          status: 400,
          retryable: false,
          meta: meta(request),
        });
      }

      return reply.status(200).send({ data: { date, slots: SLOTS }, meta: meta(request) });
    },
  );
}
