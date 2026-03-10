import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { projects } from '../db/schema';

export const projectsRoutes = new Elysia({ prefix: '/projects' })
  // Get all projects
  .get('/', async () => {
    const allProjects = await db
      .select()
      .from(projects)
      .orderBy(projects.createdAt);
    return allProjects;
  })

  // Get a single project
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();
      if (!project) {
        set.status = 404;
        return { error: 'Project not found' };
      }
      return project;
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // Create a new project
  .post(
    '/',
    async ({ body }) => {
      const id = crypto.randomUUID();
      const newProject = await db
        .insert(projects)
        .values({
          id,
          title: body.title,
        })
        .returning()
        .get();

      return newProject;
    },
    {
      body: t.Object({ title: t.String() }),
    },
  )

  // Delete a project
  .delete(
    '/:id',
    async ({ params: { id }, set }) => {
      const deletedProject = await db
        .delete(projects)
        .where(eq(projects.id, id))
        .returning()
        .get();
      if (!deletedProject) {
        set.status = 404;
        return { error: 'Project not found' };
      }
      return deletedProject;
    },
    {
      params: t.Object({ id: t.String() }),
    },
  );
