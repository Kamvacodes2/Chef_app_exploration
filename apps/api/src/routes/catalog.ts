import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool } from "pg";

function meta(request: FastifyRequest) {
  return { requestId: request.id, correlationId: request.id };
}

export async function registerCatalogRoutes(app: FastifyInstance, pool: Pool): Promise<void> {
  app.get("/api/v1/catalog/categories", async (request, reply) => {
    const result = await pool.query<{
      slug: string;
      name: string;
      palette_id: string;
      mood: string;
      sort_order: number;
    }>(
      `SELECT slug, name, palette_id, mood, sort_order
         FROM app.catalog_categories
        ORDER BY sort_order ASC`,
    );

    return reply.status(200).send({
      data: result.rows.map((row) => ({
        slug: row.slug,
        name: row.name,
        paletteId: row.palette_id,
        mood: row.mood,
        sortOrder: row.sort_order,
      })),
      meta: meta(request),
    });
  });

  app.get<{ Querystring: { category?: string } }>(
    "/api/v1/catalog/meals",
    async (request, reply) => {
      const values: string[] = [];
      const where = request.query.category
        ? "WHERE ci.category_slug = $1 AND ci.active"
        : "WHERE ci.active";
      if (request.query.category) values.push(request.query.category);

      const result = await pool.query(
        `SELECT ci.slug,
                ci.category_slug,
                cc.name AS category_name,
                ci.name,
                ci.description,
                ci.price_display,
                ci.image_src, ci.image_alt, ci.image_width, ci.image_height,
                ci.is_hot, ci.has_cutlery, ci.sort_order, ci.active
           FROM app.catalog_items ci
      INNER JOIN app.catalog_categories cc ON cc.slug = ci.category_slug
           ${where}
          ORDER BY ci.sort_order ASC`,
        values,
      );

      return reply.status(200).send({ data: result.rows.map(toMeal), meta: meta(request) });
    },
  );

  app.get<{ Params: { slug: string } }>("/api/v1/catalog/meals/:slug", async (request, reply) => {
    const result = await pool.query(
      `SELECT ci.slug,
              ci.category_slug,
              cc.name AS category_name,
              ci.name,
              ci.description,
              ci.price_display,
              ci.image_src, ci.image_alt, ci.image_width, ci.image_height,
              ci.is_hot, ci.has_cutlery, ci.sort_order, ci.active
         FROM app.catalog_items ci
    INNER JOIN app.catalog_categories cc ON cc.slug = ci.category_slug
        WHERE ci.slug = $1 AND ci.active`,
      [request.params.slug],
    );

    const row = result.rows[0];
    if (!row)
      return reply.status(404).send({
        code: "NOT_FOUND",
        message: "Meal not found",
        status: 404,
        retryable: false,
        meta: meta(request),
      });
    return reply.status(200).send({ data: toMeal(row), meta: meta(request) });
  });
}

function toMeal(row: Record<string, unknown>) {
  return {
    slug: String(row.slug),
    categorySlug: String(row.category_slug),
    categoryName: String(row.category_name ?? row.category_slug),
    name: String(row.name),
    description: String(row.description),
    priceDisplay: String(row.price_display),
    image: {
      src: String(row.image_src),
      alt: String(row.image_alt),
      width: Number(row.image_width),
      height: Number(row.image_height),
    },
    isHot: Boolean(row.is_hot),
    hasCutlery: Boolean(row.has_cutlery),
    isActive: Boolean(row.active),
    sortOrder: Number(row.sort_order),
  };
}
