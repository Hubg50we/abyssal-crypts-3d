FROM python:3.11-slim

# Create standard non-root user for Hugging Face Spaces container environment
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /home/user/app

# Copy application files with proper ownership
COPY --chown=user:user . /home/user/app

# Port configuration (HF Spaces routes traffic to app_port 8000)
ENV PORT=8000
EXPOSE 8000

CMD ["python", "server.py"]
