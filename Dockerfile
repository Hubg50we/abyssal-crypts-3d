FROM python:3.11-slim

WORKDIR /app

# Copy project files
COPY . /app

# Cloud providers dynamically set PORT environment variable
ENV PORT=8000
EXPOSE 8000

CMD ["python", "server.py"]
