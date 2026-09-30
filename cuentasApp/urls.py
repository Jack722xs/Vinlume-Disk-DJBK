from django.contrib.auth.views import LogoutView
from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.VinlumeLoginView.as_view(), name='login'),
    path('registro/', views.registro, name='registro'),
    path('logout/', LogoutView.as_view(), name='logout'),
]
