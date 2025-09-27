from django.shortcuts import render, redirect
from .forms import AgendamentoPublicoForm
from .models import AgendamentoPublico


def agendamento_publico(request):
    if request.method == 'POST':
        form = AgendamentoPublicoForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('agendamento_publico')
    else:
        form = AgendamentoPublicoForm()
    
    agendamentos = AgendamentoPublico.objects.all().order_by('-criado_em')
    return render(request, 'usuarios/agendamento_publico.html', {'form': form, 'agendamentos': agendamentos})
