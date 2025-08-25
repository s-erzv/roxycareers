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
    
    # Menambahkan relasi untuk pertanyaan khusus job ini
    custom_questions = models.ManyToManyField('Question', related_name='custom_jobs', blank=True)
    # Menambahkan relasi untuk template asesmen yang dipilih
    assessment_template = models.ForeignKey('AssessmentTemplate', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.title

# Model untuk Pertanyaan Asesmen (Bank Soal)
class Question(models.Model):
    QUESTION_TYPES = [
        ('ESSAY', 'Essay'),
        ('MULTIPLE_CHOICE', 'Multiple Choice'),
        ('SINGLE_CHOICE', 'Single Choice'),
        ('FILE_UPLOAD', 'File Upload'),
        ('CODING_CHALLENGE', 'Coding Challenge'),
        ('TEXT_INPUT', 'Text Input'),
        ('INTEGER_INPUT', 'Integer Input'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    text = models.TextField()
    question_type = models.CharField(max_length=50, choices=QUESTION_TYPES, default='ESSAY')
    options = models.JSONField(null=True, blank=True)
    solution = models.TextField(null=True, blank=True)
    is_template_question = models.BooleanField(default=False)
    
    def __str__(self):
        return f"Question: {self.text[:50]}..."
        
# Model untuk Template Asesmen
class AssessmentTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    questions = models.ManyToManyField(Question, related_name='templates')

    def __str__(self):
        return self.name

# Model untuk Pelamar/Kandidat
class Applicant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applicants')
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    status = models.CharField(max_length=50, default='applied')
    
    def __str__(self):
        return self.name

# Model untuk Penjadwalan Wawancara
class Schedule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    applicant = models.OneToOneField(Applicant, on_delete=models.CASCADE, related_name='schedule')
    interview_time = models.DateTimeField()
    
    def __str__(self):
        return f"Schedule for {self.applicant.name}"

# Model untuk Jawaban Asesmen
class AssessmentAnswer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    applicant = models.ForeignKey(Applicant, on_delete=models.CASCADE, related_name='assessment_answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer = models.TextField()
    is_correct = models.BooleanField(null=True, blank=True)
    score = models.IntegerField(null=True, blank=True)
    
    def __str__(self):
        return f"Answer by {self.applicant.name} for question {self.question.id}"