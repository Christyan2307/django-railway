from django import forms
from .models import AgendamentoPublico

class AgendamentoPublicoForm(forms.ModelForm):
    class Meta:
        model = AgendamentoPublico
        fields = ['nome', 'telefone', 'status']
        widgets = {
            'status': forms.Select(attrs={'class': 'form-select'}),
            'nome': forms.TextInput(attrs={'class': 'form-control'}),
            'telefone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Somente números'}),
        }

    def clean_telefone(self):
        telefone = self.cleaned_data.get('telefone', '')
        # Adiciona +55 se não estiver presente
        if not telefone.startswith('+55'):
            telefone = '+55' + telefone
        return telefone
