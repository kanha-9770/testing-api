const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Main endpoint: GET /api/website/homepage
app.get('/api/website/homepage', async (req, res) => {
  try {
    const record = await prisma.formRecord1.findFirst({
      where: {
        form: {
          name: 'Homepage',
          module: {
            name: 'Website',
          },
          isPublished: true,
        },
        status: 'published',
      },
      orderBy: {
        submittedAt: 'desc',
      },
      select: {
        recordData: true,
        submittedBy: true,
        submittedAt: true,
        status: true,
        form: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!record) {
      return res.status(404).json({ error: 'Homepage data not found. Ensure the form and record are set up in the database.' });
    }

    let parsedData;
    try {
      parsedData = typeof record.recordData === 'string' ? JSON.parse(record.recordData) : record.recordData;
    } catch (parseError) {
      console.error('Error parsing recordData:', parseError);
      return res.status(500).json({ error: 'Invalid data format in database record' });
    }

    const response = {
      data: parsedData,
      metadata: {
        formId: record.form.id,
        formName: record.form.name,
        submittedBy: record.submittedBy,
        submittedAt: record.submittedAt,
        status: record.status,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Optional: Endpoint to fetch form structure
app.get('/api/website/homepage/structure', async (req, res) => {
  try {
    const form = await prisma.form.findFirst({
      where: {
        name: 'Homepage',
        module: {
          name: 'Website',
        },
      },
      include: {
        module: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            fields: {
              orderBy: { order: 'asc' },
            },
            subforms: {
              orderBy: { order: 'asc' },
              include: {
                fields: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        records1: {
          where: { status: 'published' },
          orderBy: { submittedAt: 'desc' },
          take: 1,
          select: { recordData: true },
        },
      },
    });

    if (!form) {
      return res.status(404).json({ error: 'Form structure not found' });
    }

    res.json(form);
  } catch (error) {
    console.error('Error fetching form structure:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler (FIXED: No path specified)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Homepage data: http://localhost:${PORT}/api/website/homepage`);
  console.log(`Form structure: http://localhost:${PORT}/api/website/homepage/structure`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});
