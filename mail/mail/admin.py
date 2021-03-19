from django.contrib import admin
from .models import User, Email

# Register your models here.
class EmailAdmin(admin.ModelAdmin):
    model = Email
    list_display = ('timestamp', 'subject', 'id')

# I added this to make it easier to add test data
admin.site.register(User)
admin.site.register(Email, EmailAdmin)