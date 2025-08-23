from django.urls import path
from .views import apply, rescreen_applicant, auto_schedule_interviews
from . import views

urlpatterns = [
   path('apply', apply, name='apply'),
    path('rescreen-applicant', rescreen_applicant, name='rescreen_applicant'),
    path('jobs/<uuid:job_id>/schedule/', auto_schedule_interviews, name='auto-schedule-interviews'),
    path('auto_schedule_interviews/<uuid:job_id>/', views.auto_schedule_interviews, name='auto_schedule_interviews'),
    path('question-bank/', views.manage_question_bank, name='question_bank'),
    path('assessment-templates/', views.manage_assessment_templates, name='assessment_templates'),
    path('assessment-templates/<uuid:template_id>/questions/', views.add_question_to_template, name='add_question_to_template'),
    path('applicants/<uuid:applicant_id>/review_assessment/', views.review_assessment, name='review_assessment'),
   path('jobs/<uuid:job_id>/assessment-questions/', views.get_job_assessment_questions, name='get_job_assessment_questions'),
]
