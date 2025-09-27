from django.urls import path
from . import views

urlpatterns = [
    path('agendamento/', views.agendamento_publico, name='agendamento_publico'),
]
