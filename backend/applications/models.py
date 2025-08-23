from django.db import models
from django.utils import timezone
import uuid

# Model untuk Lowongan Pekerjaan
class Job(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    daily_start_time = models.TimeField(null=True, blank=True)
    daily_end_time = models.TimeField(null=True, blank=True)
    duration_per_interview_minutes = models.IntegerField(default=60)
    
    def __str__(self):
        return self.title

# Model untuk Pelamar/Kandidat
class Applicant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applicants')
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    status = models.CharField(max_length=50, default='applied') # e.g., 'applied', 'shortlisted', 'scheduled'
    
    def __str__(self):
        return self.name

# Model untuk Penjadwalan Wawancara
class Schedule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    applicant = models.OneToOneField(Applicant, on_delete=models.CASCADE, related_name='schedule')
    interview_time = models.DateTimeField()
    
    def __str__(self):
        return f"Schedule for {self.applicant.name}"