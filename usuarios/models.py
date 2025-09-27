from django.db import models

class AgendamentoPublico(models.Model):
    STATUS_CHOICES = [
        ('andamento', 'Em andamento'),
        ('aprovado', 'Aprovado'),
        ('cancelado', 'Cancelado'),
    ]

    nome = models.CharField(max_length=100)
    telefone = models.CharField(max_length=15)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='andamento')
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nome} - {self.telefone}"
