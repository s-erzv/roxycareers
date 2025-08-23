from django.urls import path
from .views import apply, rescreen_applicant, auto_schedule_interviews
from . import views

urlpatterns = [
   path('apply', apply, name='apply'),
    path('rescreen-applicant', rescreen_applicant, name='rescreen_applicant'),
    path('jobs/<uuid:job_id>/schedule/', auto_schedule_interviews, name='auto-schedule-interviews'),
    path('auto_schedule_interviews/<uuid:job_id>/', views.auto_schedule_interviews, name='auto_schedule_interviews')
]
